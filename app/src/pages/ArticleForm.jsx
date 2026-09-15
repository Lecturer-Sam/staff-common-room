import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addDoc, collection, doc, getDoc, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import RichEditor from '../components/RichEditor'
import { useCurriculum } from '../hooks/useCurriculum'
import { Button, Field, Input, Select } from '../components/ui'

const CATEGORIES = [
  'Teaching Tips', 'Classroom Management', 'Curriculum Insights',
  'Professional Development', 'Announcements', 'General',
]

function strip(html = '') {
  return html.replace(/<[^>]*>/g, '').trim()
}

export default function ArticleForm() {
  const { articleId } = useParams()
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { subjects } = useCurriculum()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [subjectId, setSubjectId] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Load for edit
  useEffect(() => {
    if (!articleId) return
    getDoc(doc(db, 'articles', articleId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const a = snap.data()
      setTitle(a.title ?? '')
      setContent(a.content ?? '')
      setCategory(a.category ?? 'General')
      setSubjectId(a.subjectId ?? '')
      setVisibility(a.visibility ?? 'public')
    })
  }, [articleId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!strip(content)) {
      toast.error('Please write some content before publishing.')
      return
    }
    setBusy(true)
    const payload = {
      title: title.trim(),
      content,
      category,
      subjectId,
      visibility,
      excerpt: strip(content).slice(0, 200),
      updatedAt: serverTimestamp(),
    }
    try {
      if (articleId) {
        await updateDoc(doc(db, 'articles', articleId), payload)
        toast.success('Article updated.')
        navigate(`/portal/articles/${articleId}`)
      } else {
        const ref = await addDoc(collection(db, 'articles'), {
          ...payload,
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          likesCount: 0,
          likedBy: [],
          createdAt: serverTimestamp(),
        })
        toast.success('Article published.')
        navigate(`/portal/articles/${ref.id}`)
      }
    } catch {
      toast.error('Failed to save article.')
      setBusy(false)
    }
  }

  if (notFound) return <p className="text-slate-500">Article not found.</p>

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-3 text-sm text-slate-500">
        <Link to="/portal/articles" className="text-brand hover:underline">Articles</Link>
        {' '}/ {articleId ? 'Edit article' : 'New article'}
      </nav>
      <h1 className="page-title mb-6">{articleId ? 'Edit article' : 'Write an article'}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your article a clear title…"
            className="py-3 text-base font-medium"
          />
        </Field>

        {/* Category + Subject + Visibility row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Category" htmlFor="category">
            <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Subject (optional)" htmlFor="subject">
            <Select id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">No specific subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Visibility" htmlFor="visibility">
            <Select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="public">Public — visible to everyone</option>
              <option value="members">Members only</option>
            </Select>
          </Field>
        </div>

        {/* WYSIWYG body */}
        <Field label="Content">
          <RichEditor
            content={content}
            onChange={setContent}
            placeholder="Share your knowledge, insights, or tips with fellow teachers…"
            minHeight={400}
          />
        </Field>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-1">
          <Button type="submit" size="lg" disabled={busy || !title.trim()}>
            {busy ? 'Saving…' : articleId ? 'Save changes' : 'Publish article'}
          </Button>
          <Button to="/portal/articles" variant="secondary" size="lg">Cancel</Button>
        </div>
      </form>
    </div>
  )
}
