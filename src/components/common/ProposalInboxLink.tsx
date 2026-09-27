import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { canReviewProposal, canSeeProposal, PROPOSAL_LABELS, PROPOSAL_ROLES } from '../../lib/projectProposals';
import { uiText } from '../../i18n/ui';
export function ProposalInboxLink(){
 const s=useStore(),user=s.currentUser;
 if(!user||!PROPOSAL_ROLES.includes(user.role))return null;
 const pending=s.proposals.filter(p=>canSeeProposal(user,p)&&(canReviewProposal(user,p)||(user.role==='MINISTER'&&p.createdById===user.id&&['DRAFT','RETURNED'].includes(p.status))));
 return <section className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><Link to="/project-proposals" className="font-semibold text-blue-900">{uiText('Project proposals')} · {pending.length} {uiText('awaiting action')} →</Link>{pending.slice(0,3).map(p=><p key={p.id} className="mt-1 text-sm text-slate-600">{p.name} — {uiText(PROPOSAL_LABELS[p.status])}</p>)}</section>;
}
