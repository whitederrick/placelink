import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import { PlaceMergeCandidateList } from "@/features/place-merge-candidates/components/PlaceMergeCandidateList";
import { listPlaceMergeCandidates } from "@/features/place-merge-candidates";
export default async function DuplicateCandidatesPage() { const session = await auth(); const actor = session?.user?.id ? await loadHumanActor(session.user.id) : null; if (!actor) notFound(); const candidates = await listPlaceMergeCandidates(actor); return <div className="studio-page"><header className="studio-page-heading"><div><span className="section-kicker">CONTENT QUALITY</span><h1>장소 중복 후보</h1><p>자동 병합하지 않습니다. 기각 또는 별도 승인 절차로 검토하세요.</p></div></header><PlaceMergeCandidateList initialCandidates={candidates.map((candidate) => ({ ...candidate, detectedAt: candidate.detectedAt.toISOString() }))} /></div>; }
export const dynamic = "force-dynamic";
