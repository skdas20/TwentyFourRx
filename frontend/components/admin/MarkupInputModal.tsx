'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface MarkupInputModalProps {
  isOpen: boolean
  onConfirm: (markupValue: number, markupType: 'PERCENTAGE' | 'FIXED') => void
  onClose: () => void
  defaultMarkup?: number
  defaultMarkupType?: 'PERCENTAGE' | 'FIXED'
  title?: string
}

export default function MarkupInputModal({
  isOpen,
  onConfirm,
  onClose,
  defaultMarkup = 0,
  defaultMarkupType = 'PERCENTAGE',
  title = 'Enter Admin Markup'
}: MarkupInputModalProps) {
  const [markup, setMarkup] = useState(defaultMarkup.toString())
  const [markupType, setMarkupType] = useState<'PERCENTAGE' | 'FIXED'>(defaultMarkupType)

  useEffect(() => {
    if (!isOpen) {
      setMarkup(defaultMarkup.toString())
      setMarkupType(defaultMarkupType)
    }
  }, [isOpen, defaultMarkup, defaultMarkupType])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const markupValue = parseFloat(markup)
    if (isNaN(markupValue) || markupValue < 0) {
      return
    }
    if (markupType === 'PERCENTAGE' && markupValue > 100) {
      return
    }
    onConfirm(markupValue, markupType)
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
          {/* Markup Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Markup Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="markupType"
                  value="PERCENTAGE"
                  checked={markupType === 'PERCENTAGE'}
                  onChange={() => setMarkupType('PERCENTAGE')}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Percentage (%)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="markupType"
                  value="FIXED"
                  checked={markupType === 'FIXED'}
                  onChange={() => setMarkupType('FIXED')}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Fixed Value (₹)</span>
              </label>
            </div>
          </div>

          {/* Markup Value Input */}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {markupType === 'PERCENTAGE' ? 'Markup Percentage (0-100)' : 'Fixed Markup Amount (₹)'}
          </label>
          <input
            type="number"
            min="0"
            max={markupType === 'PERCENTAGE' ? '100' : undefined}
            step="0.1"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                       rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg 
                       hover:bg-green-700 transition-colors font-medium"
            >
              Approve
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
