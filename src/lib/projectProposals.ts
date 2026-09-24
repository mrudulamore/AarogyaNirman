import type { BillAttachment, Project, ProjectType, Role, Scheme, User } from '../types';
import type { StoreState } from '../store/useStore';
import { MAHARASHTRA_HIERARCHY, SCHEMES } from './constants';
import { districtCoords } from './geo';

export type ProposalStatus = 'DRAFT' | 'ADMIN_REVIEW' | 'TECHNICAL_REVIEW' | 'DIVISION_ASSIGNMENT' | 'EE_SANCTION' | 'RETURNED' | 'REJECTED' | 'APPROVED';
export interface ProposalInput {
  name: string; district: string; taluka: string; type: ProjectType; scheme: Scheme;
  estimatedCost: number; bedCount: number; landDetails: string; justification: string; attachments: BillAttachment[];
}
export interface ProjectProposal extends ProposalInput {
  id: string; division: string; createdById: string; status: ProposalStatus; executiveEngineerId?: string;
  sanctionReference?: string; projectId?: string;
  history: { action: string; from: ProposalStatus; to: ProposalStatus; actorId: string; actorName: string; role: Role; date: string; comments: string }[];
}
export const PROPOSAL_LABELS: Record<ProposalStatus, string> = {
  DRAFT: 'Draft', ADMIN_REVIEW: 'Administrative scrutiny', TECHNICAL_REVIEW: 'Chief Engineer review',
  DIVISION_ASSIGNMENT: 'Superintending Engineer assignment', EE_SANCTION: 'EE final sanction',
  RETURNED: 'Returned to Ministry', REJECTED: 'Rejected', APPROVED: 'Project approved',
};
export const PROPOSAL_OWNERS: Partial<Record<ProposalStatus, Role>> = { ADMIN_REVIEW: 'COMMISSIONER', TECHNICAL_REVIEW: 'CHIEF_ENGINEER', DIVISION_ASSIGNMENT: 'SUPERINTENDING_ENGINEER', EE_SANCTION: 'EXECUTIVE_ENGINEER' };
export const PROPOSAL_ROLES: Role[] = ['MINISTER','COMMISSIONER','CHIEF_ENGINEER','SUPERINTENDING_ENGINEER','EXECUTIVE_ENGINEER','SUPERADMIN'];
export function canSeeProposal(user: User | null, p: ProjectProposal): boolean {
  if (!user) return false;
  if (['MINISTER','COMMISSIONER','SUPERADMIN'].includes(user.role)) return true;
  if (['CHIEF_ENGINEER','SUPERINTENDING_ENGINEER'].includes(user.role)) return user.division === p.division;
  return user.role === 'EXECUTIVE_ENGINEER' && p.executiveEngineerId === user.id;
}
export function canReviewProposal(user: User | null, p: ProjectProposal): boolean {
  return !!user && canSeeProposal(user,p) && user.role === PROPOSAL_OWNERS[p.status];
}
export function proposalAccounts(users: User[]): User[] {
  const result = [...users];
  for (const [role,name,id] of [['CHIEF_ENGINEER','Sanjay Deshmukh','DEMO-PUNE-CE'],['SUPERINTENDING_ENGINEER','Meera Patil','DEMO-PUNE-SE']] as const) {
    if (!result.some(u=>u.id===id)) result.push({id,name,role,designation:role==='CHIEF_ENGINEER'?'Chief Engineer':'Superintending Engineer',department:'PWD, Pune Division',division:'Pune Division',email:role.toLowerCase()+'@example.test',phone:'',assignedProjectIds:[],avatarInitials:name.split(' ').map(n=>n[0]).join('')});
  }
  return result;
}
export interface ProposalActions {
  proposals: ProjectProposal[];
  saveProposal: (input: ProposalInput, id?: string) => string;
  submitProposal: (id: string) => void;
  reviewProposal: (id: string, decision: 'APPROVE'|'RETURN'|'REJECT', comments: string, eeId?: string, sanctionReference?: string) => void;
}
type SetState = (patch: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void;
export function proposalActions(set: SetState, get: () => StoreState): ProposalActions {
  const actor = () => { const user=get().currentUser; if(!user) throw new Error('Sign in first.'); return user; };
  const find = (id:string) => {const p=get().proposals.find(p=>p.id===id);if(!p)throw new Error('Proposal not found.');return p;};
  const event = (p:ProjectProposal,to:ProposalStatus,action:string,comments:string) => ({action,from:p.status,to,actorId:actor().id,actorName:actor().name,role:actor().role,date:new Date().toISOString(),comments});
  const notify = (p:ProjectProposal) => {const role=PROPOSAL_OWNERS[p.status] ?? 'MINISTER';get().pushNotification({message:`${p.name}: ${PROPOSAL_LABELS[p.status]}. Open Project Proposals.`,type:'APPROVAL',targetRoles:[role]});};
  return {
    proposals: [],
    saveProposal: (input,id) => {
      const user=actor();if(user.role!=='MINISTER')throw new Error('Only Ministry may create or edit a proposal.');
      const previous=id?find(id):undefined;
      if(previous && (previous.createdById!==user.id || !['DRAFT','RETURNED'].includes(previous.status)))throw new Error('Only your draft or returned proposal can be edited.');
      if(!input.name.trim())throw new Error('Enter a proposal name.');
      if(!['Pune','Satara'].includes(input.district))throw new Error('Choose Pune or Satara for this demo.');
      const district = MAHARASHTRA_HIERARCHY.find(d=>d.division==='Pune Division')!.districts.find(d=>d.district===input.district)!;
      if(!district.talukas.includes(input.taluka) || !SCHEMES.includes(input.scheme) || !['District Hospital','Rural Hospital','Sub-District Hospital','Women & Child Hospital','Tribal Area Hospital','Community Health Centre'].includes(input.type)) throw new Error('Select a valid taluka, scheme and hospital type.');
      if(!Number.isFinite(input.estimatedCost)||input.estimatedCost<0||!Number.isInteger(input.bedCount)||input.bedCount<1)throw new Error('Enter valid cost and bed count.');
      if(input.attachments.length>5 || input.attachments.some(a=>a.mimeType!=='application/pdf'||a.size<=0||a.size>5*1024*1024))throw new Error('Attach up to five PDF documents, 5 MB each.');
      const fields: ProposalInput = {name:input.name.trim(),district:input.district,taluka:input.taluka.trim(),type:input.type,scheme:input.scheme,estimatedCost:input.estimatedCost,bedCount:input.bedCount,landDetails:input.landDetails.trim(),justification:input.justification.trim(),attachments:input.attachments};
      const proposal:ProjectProposal={...fields,id:previous?.id??'PROP-'+crypto.randomUUID(),division:'Pune Division',createdById:user.id,status:previous?.status??'DRAFT',history:previous?.history??[],executiveEngineerId:previous?.executiveEngineerId};
      proposal.history=[...proposal.history,event(proposal,proposal.status,'SAVE','Proposal saved')];
      set(s=>({proposals:previous?s.proposals.map(p=>p.id===id?proposal:p):[proposal,...s.proposals]}));return proposal.id;
    },
    submitProposal: id => {
      const p=find(id);const user=actor();
      if(user.role!=='MINISTER'||p.createdById!==user.id||!['DRAFT','RETURNED'].includes(p.status))throw new Error('Only Ministry can submit its draft or returned proposal.');
      if(!p.taluka||!p.landDetails||!p.justification||p.estimatedCost<=0||!p.attachments.length)throw new Error('Complete location, cost, land details, justification and supporting documents before submitting.');
      const next:ProjectProposal={...p,status:'ADMIN_REVIEW',executiveEngineerId:undefined,history:[...p.history,event(p,'ADMIN_REVIEW','SUBMIT','Submitted for administrative scrutiny')]};
      set(s=>({proposals:s.proposals.map(x=>x.id===id?next:x)}));get().logAction('Submitted project proposal',p.name);notify(next);
    },
    reviewProposal: (id,decision,comments,eeId,sanctionReference) => {
      const p=find(id);if(!canReviewProposal(actor(),p))throw new Error('This proposal is not awaiting your review.');
      if(!['APPROVE','RETURN','REJECT'].includes(decision))throw new Error('Invalid decision.');
      if(!comments.trim())throw new Error('Enter review comments.');
      let status:ProposalStatus=decision==='RETURN'?'RETURNED':'REJECTED';
      let assigned=p.executiveEngineerId;
      if(decision==='APPROVE'){
        const next:Partial<Record<ProposalStatus,ProposalStatus>>={ADMIN_REVIEW:'TECHNICAL_REVIEW',TECHNICAL_REVIEW:'DIVISION_ASSIGNMENT',DIVISION_ASSIGNMENT:'EE_SANCTION',EE_SANCTION:'APPROVED'};
        status=next[p.status]!;
        if(p.status==='DIVISION_ASSIGNMENT'){
          const ee=get().users.find(u=>u.id===eeId&&u.role==='EXECUTIVE_ENGINEER'&&u.division===p.division);
          if(!ee)throw new Error('Select an Executive Engineer in Pune Division.');assigned=ee.id;
        }
        if(status==='APPROVED'&&!sanctionReference?.trim())throw new Error('Enter the technical sanction reference.');
      }
      const projectId=status==='APPROVED'?'PRJ-'+crypto.randomUUID():undefined;
      const tenderId=projectId?'TND-'+crypto.randomUUID():undefined;
      const updated:ProjectProposal={...p,status,executiveEngineerId:assigned,sanctionReference:status==='APPROVED'?sanctionReference!.trim():undefined,projectId,history:[...p.history,event(p,status,decision,comments.trim())]};
      let project:Project|undefined;
      if(projectId){
        const date=new Date().toISOString().slice(0,10),coords=districtCoords(p.district,0);
        project={id:projectId,tenderId,proposalId:p.id,name:p.name,type:p.type,scheme:p.scheme,facilityType:({'District Hospital':'District / Civil Hospital','Rural Hospital':'Rural Hospital','Sub-District Hospital':'Sub-District Hospital','Women & Child Hospital':'Women Hospital','Tribal Area Hospital':'CHC','Community Health Centre':'CHC'} as const)[p.type],division:p.division,district:p.district,taluka:p.taluka,status:'ON_TRACK',stage:'TENDER',bedCount:p.bedCount,sanctionedBudget:p.estimatedCost,revisedEstimate:p.estimatedCost,tenderAmount:0,workOrderValue:0,amountSpent:0,amountReleased:0,physicalProgress:0,financialProgress:0,reportedProgress:0,verifiedProgress:0,executiveEngineerId:assigned!,siteEngineerId:'',projectManagerId:'',ownerDirectorId:p.createdById,contractorId:'',pmcName:'',startDate:date,originalCompletionDate:'',plannedCompletionDate:'',delayDays:0,lat:50,lng:50,siteLat:coords.lat,siteLng:coords.lng,description:p.justification,qualityScore:0,imageSeed:1};
      }
      set(s=>({proposals:s.proposals.map(x=>x.id===id?updated:x),...(project?{projects:[project,...s.projects],tenders:[{id:tenderId!,projectId:projectId!,title:p.name,estimatedCost:p.estimatedCost,tenderType:'OPEN' as const,publishDate:'',submissionDeadline:'',bidders:[],status:'DRAFT' as const},...s.tenders],users:s.users.map(u=>u.id===assigned?{...u,assignedProjectIds:[...u.assignedProjectIds,projectId!]}:u),currentUser:s.currentUser && s.currentUser.id===assigned?{...s.currentUser,assignedProjectIds:[...s.currentUser.assignedProjectIds,projectId!]}:s.currentUser}: {})}));
      get().logAction(`Project proposal ${decision}: ${comments.trim()}`,p.name);notify(updated);
    },
  };
}
