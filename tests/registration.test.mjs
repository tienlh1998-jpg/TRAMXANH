import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
test('Self registration provisions only the verified user as student, preserves existing roles and locked profiles',async()=>{
 const source=await readFile(new URL('../src/lib/student-registration.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;$/gm,'').replace('export async function','async function');
 const writes=[];const factory=()=>({from:()=>({upsert:async(data,options)=>{writes.push({data,options});return {error:null};}})});
 const provision=new Function('adminClient','process',js+';return provisionStudent;')(factory,{env:{SUPABASE_SERVICE_ROLE_KEY:'test-only',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid'}});
 const client=(user,existing=null)=>({auth:{getUser:async()=>({data:{user},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:existing,error:null})})})})});
 assert.ok(await provision(client(null)));assert.equal(writes.length,0);
 const user={id:'12345678-1234-4234-8234-123456789012',email:'student@example.invalid',user_metadata:{ecopoint_signup:true,full_name:'Học sinh',role:'ADMIN',active:true}};
 assert.equal(await provision(client(user,{id:user.id})), '');assert.equal(writes.length,0);
 assert.equal(await provision(client({...user,user_metadata:{full_name:'Existing Auth'}})), '');assert.equal(writes.length,0);
 assert.equal(await provision(client(user)), '');assert.equal(writes.length,1);assert.equal(writes[0].data.role,'STUDENT');assert.equal(writes[0].data.id,user.id);assert.equal(writes[0].data.active,true);assert.equal(writes[0].options.ignoreDuplicates,true);
});
