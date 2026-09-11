import { useNavigate } from 'react-router-dom'
import { BookOpen, ArrowLeft } from 'lucide-react'
import useQuizStore from '../stores/quizStore'
import QuizPlayer from '../components/quiz/QuizPlayer'

/**
 * Quiz Player route.
 * - If a quiz session is active → show QuizPlayer component
 * - Otherwise → show an idle prompt that sends the user to Learner Path
 */
export default function QuizPlayerRoute() {
  const status   = useQuizStore((s) => s.status)
  const navigate = useNavigate()

  if (status === 'active') {
    return <QuizPlayer />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full
                    px-6 py-16 text-center gap-5">
      <div className="h-16 w-16 rounded-2xl bg-navy flex items-center justify-center">
        <BookOpen size={28} className="text-accent" />
      </div>

      <div>
        <h2 className="text-[20px] font-bold text-navy">No quiz running</h2>
        <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed max-w-xs">
          Browse the curriculum, select a Content Standard, then tap
          <strong className="text-navy"> Start Quiz</strong>.
        </p>
      </div>

      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full
                   bg-navy text-accent font-bold text-[13px]
                   active:scale-95 transition-transform"
      >
        <ArrowLeft size={16} />
        Browse Curriculum
      </button>
    </div>
  )
}
