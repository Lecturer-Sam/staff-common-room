// The seed payload is data someone else published 
// (me, from the admin portal, in Task 7) — never trust it. 
// Zod 4 schemas, same module Task 3 will extend for auth forms:


import { z } from 'zod'

export const classSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(),
  label: z.string(), order: z.number().int().positive(),
})

export const subjectSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(),
  icon: z.string(), colour: z.string(), blurb: z.string(),
})

export const strandSchema = z.object({
  id: z.string(), classId: z.string(), subjectId: z.string(),
  num: z.number().int().positive(), name: z.string(), code: z.string(),
})

export const subStrandSchema = z.object({
  id: z.string(), strandId: z.string(), classId: z.string(),
  subjectId: z.string(), num: z.number().int().positive(),
  name: z.string(), code: z.string(),
})

export const contentStandardSchema = z.object({
  id: z.string(), subStrandId: z.string(), strandId: z.string(),
  classId: z.string(), subjectId: z.string(), code: z.string(),
  title: z.string(), indicators: z.array(z.string()),
  coreCompetencies: z.array(z.string()),
})

export const questionSchema = z.object({
  id: z.string(), csId: z.string(), classId: z.string(), subjectId: z.string(),
  type: z.enum(['mcq', 'multi', 'tf', 'num', 'short']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  stem: z.string(),
  options: z.array(z.string()),
  // mcq/num/tf → number · multi → number[] · short → string[]
  answer: z.union([z.number(), z.array(z.number()), z.array(z.string())]),
  explanation: z.string(),
  tags: z.array(z.string()),
})

export const curriculumSchema = z.object({
  meta: z.object({ name: z.string(), version: z.string(), generated: z.string().optional(), notice: z.string().optional(), levels: z.array(z.string()).optional() }),
  classes: z.array(classSchema),
  subjects: z.array(subjectSchema),
  strands: z.array(strandSchema),
  subStrands: z.array(subStrandSchema),
  contentStandards: z.array(contentStandardSchema),
})

export const questionPackSchema = z.object({
  meta: z.object({ version: z.string(), generated: z.string().optional(), types: z.array(z.string()).optional(), difficulties: z.array(z.string()).optional(), count: z.number().int().optional() }),
  items: z.array(questionSchema),
})


export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signUpSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  passwordConfirm: z.string().min(1, 'Confirm your password'),
}).refine((d) => d.password === d.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
})