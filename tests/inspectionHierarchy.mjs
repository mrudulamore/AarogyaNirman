import assert from 'node:assert/strict';
import {createServer} from 'vite';
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};globalThis.window={localStorage};
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {useStore}=await server.ssrLoadModule('/src/store/useStore.ts');
 const {INSPECTION_HIERARCHY,inspectionAssignmentRoles,canReviewInspection}=await server.ssrLoadModule('/src/lib/inspectionAccess.ts');
 const s=()=>useStore.getState();const project=s().projects.find(p=>p.division==='Pune Division');
 const base=s().users.find(u=>u.role==='DEPUTY_ENGINEER');
 const users=INSPECTION_HIERARCHY.map((role,i)=>({...base,id:'HIER-'+i,name:role,role,division:project.division,district:project.district,assignedProjectIds:[project.id]}));
 useStore.setState({users:[...s().users,...users]});
 for(let i=0;i<users.length;i++){
  useStore.setState({currentUser:users[i]});assert.deepEqual(inspectionAssignmentRoles(users[i]),INSPECTION_HIERARCHY.slice(i+1));
  assert.equal(canReviewInspection(users[i]),users[i].role==='EXECUTIVE_ENGINEER');
  for(let j=0;j<users.length;j++){
   const input={projectId:project.id,category:'STRUCTURAL',scheduledDate:'2026-10-01',scheduledTime:'10:00',location:'Ward',scope:'Structure',assignedToId:users[j].id,inspector:'',comments:''};
   if(j<=i){assert.throws(()=>s().scheduleInspection(input));continue;}
   const inspection=s().scheduleInspection(input);
   assert.throws(()=>s().assignInspection(inspection.id,users[i].id,'Upward assignment'));
   s().assignInspection(inspection.id,users[j].id,'Site coverage');
   assert.equal(s().inspections.find(x=>x.id===inspection.id).assignmentHistory.length,2);
   useStore.setState({currentUser:users[j]});s().startInspection(inspection.id);useStore.setState({currentUser:users[i]});
  }
 }
 console.log('All engineering hierarchy pairs: downward assignment/reassignment and conduct pass; peers/upward blocked; EE review retained.');
}finally{await server.close()}
