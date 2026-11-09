import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'admission.studentId'
export const STUDENT_ID_INPUT_ID = 'student-id-input'

export function isValidStudentId(value: string): boolean {
  return /^\d{17}$/.test(value)
}

interface StudentValue {
  studentId: string
  setStudentId: (id: string) => void
}

const StudentContext = createContext<StudentValue | null>(null)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? ''
    return isValidStudentId(saved) ? saved : ''
  })

  const setStudentId = useCallback((id: string) => {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
    setState(id)
  }, [])

  const value = useMemo(() => ({ studentId, setStudentId }), [studentId, setStudentId])
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudent(): StudentValue {
  const value = useContext(StudentContext)
  if (!value) throw new Error('useStudent must be used inside StudentProvider')
  return value
}

export function focusStudentInput() {
  const input = document.getElementById(STUDENT_ID_INPUT_ID)
  input?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  input?.focus()
}
