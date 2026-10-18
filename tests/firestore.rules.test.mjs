import { readFileSync } from 'node:fs';
import { test, after } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'qed3-2a2d8',
  firestore: {host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}
});
after(async()=>await env.cleanup());
await env.clearFirestore();
const dbAs=(uid,claims={})=>env.authenticatedContext(uid,claims).firestore();
const guest=env.unauthenticatedContext().firestore();
const customer=dbAs('customer'),other=dbAs('other'),admin=dbAs('boss',{admin:true});
const catalog=dbAs('editor',{role:'catalog_manager'});
const orders=dbAs('ops',{role:'order_manager'});
const support=dbAs('helper',{role:'support_agent'});

await env.withSecurityRulesDisabled(async ctx=>{
 const db=ctx.firestore();
 await setDoc(doc(db,'products','p1'),{name:'Filter',retail:100});
 await setDoc(doc(db,'wholesalePrices','p1'),{price:80});
 await setDoc(doc(db,'users','customer'),{dealerApproved:false,name:'Client'});
 await setDoc(doc(db,'users','dealer'),{dealerApproved:true,name:'Dealer'});
 await setDoc(doc(db,'orders','o1'),{userId:'customer',status:'pending_review',items:[{productId:'p1',quantity:1}]});
});

test('public reads catalog, not wholesale prices',async()=>{
 await assertSucceeds(getDoc(doc(guest,'products','p1')));
 await assertFails(getDoc(doc(guest,'wholesalePrices','p1')));
});
test('customer cannot edit products or prices',async()=>{
 await assertFails(setDoc(doc(customer,'products','p2'),{name:'Fake',retail:0}));
 await assertFails(setDoc(doc(customer,'wholesalePrices','p1'),{price:1}));
});
test('catalog manager may edit catalog but not orders',async()=>{
 await assertSucceeds(setDoc(doc(catalog,'products','p2'),{name:'Filter 2',retail:150}));
 await assertFails(updateDoc(doc(catalog,'orders','o1'),{status:'shipped'}));
});
test('approved dealer sees wholesale prices; normal user does not',async()=>{
 await assertFails(getDoc(doc(customer,'wholesalePrices','p1')));
 await assertSucceeds(getDoc(doc(dbAs('dealer'),'wholesalePrices','p1')));
});
test('customer sees own order, not another customer order',async()=>{
 await assertSucceeds(getDoc(doc(customer,'orders','o1')));
 await assertFails(getDoc(doc(other,'orders','o1')));
});
test('support agent reads orders but cannot change them',async()=>{
 await assertSucceeds(getDoc(doc(support,'orders','o1')));
 await assertFails(updateDoc(doc(support,'orders','o1'),{status:'confirmed'}));
});
test('order manager can update but not delete orders',async()=>{
 await assertSucceeds(updateDoc(doc(orders,'orders','o1'),{status:'confirmed'}));
 await assertFails(deleteDoc(doc(orders,'orders','o1')));
});
test('admin may delete orders',async()=>{
 await assertSucceeds(deleteDoc(doc(admin,'orders','o1')));
});
test('customer cannot self-approve dealer account',async()=>{
 await assertFails(updateDoc(doc(customer,'users','customer'),{dealerApproved:true}));
});

const validOrder=(uid='customer',mode='retail',items=[{productId:'p1',quantity:2}])=>({
 userId:uid,status:'pending_review',items,requestedMode:mode,paymentMethod:'cod',
 buyer:{name:'Test Customer',phone:'01012345678',governorate:'Alexandria',address:'Street 11 Building 3'},
 createdAt:new Date(),note:'test'
});
test('legitimate retail order is accepted',async()=>{
 await assertSucceeds(setDoc(doc(customer,'orders','retail-valid'),validOrder()));
});
test('cannot create order for a different user',async()=>{
 await assertFails(setDoc(doc(customer,'orders','other-user'),validOrder('other')));
});
test('wholesale order requires dealer approval',async()=>{
 await assertFails(setDoc(doc(customer,'orders','not-approved'),validOrder('customer','wholesale')));
 await assertSucceeds(setDoc(doc(dbAs('dealer'),'orders','approved-dealer'),validOrder('dealer','wholesale')));
});
test('all order items validated, not only first item',async()=>{
 await assertFails(setDoc(doc(customer,'orders','invalid-second'),validOrder('customer','retail',[{productId:'p1',quantity:1},{productId:'p1',quantity:-100}])));
 await assertFails(setDoc(doc(customer,'orders','invalid-third'),validOrder('customer','retail',[{productId:'p1',quantity:1},{productId:'p1',quantity:1},{productId:'p1',quantity:1.5}])));
});
test('order line quantity and product id constraints',async()=>{
 await assertFails(setDoc(doc(customer,'orders','bad-id'),validOrder('customer','retail',[{productId:'',quantity:1}])));
 await assertFails(setDoc(doc(customer,'orders','extra-field'),validOrder('customer','retail',[{productId:'p1',quantity:1,retail:0}])));
});
test('maximum of 10 validated order lines',async()=>{
 await assertFails(setDoc(doc(customer,'orders','too-many'),validOrder('customer','retail',Array.from({length:11},()=>({productId:'p1',quantity:1})))));
});
