'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface TextInputModalProps {
  isOpen: boolean
  title: string
  label: string
  placeholder?: string
  defaultValue?: string
  onConfirm: (value: string) => void
  onClose: () => void
  confirmText?: string
  cancelText?: string
}

export default function TextInputModal({
  isOpen,
  title,
  label,
  placeholder = '',
  defaultValue = '',
  onConfirm,
  onClose,
  confirmText = 'Submit',
  cancelText = 'Cancel'
}: TextInputModalProps) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (!isOpen) {
      setValue(defaultValue)
    }
  }, [isOpen, defaultValue])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    onConfirm(value)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            autoFocus
          />
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                       rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition-colors font-medium"
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
