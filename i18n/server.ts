import { createTranslator } from 'next-intl'
import messages from '@/messages/en.json'
import { defaultLocale } from './config'

export const serverT = createTranslator({ locale: defaultLocale, messages, namespace: 'Server' })
