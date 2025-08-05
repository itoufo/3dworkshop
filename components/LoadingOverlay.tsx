'use client'

import { useEffect } from 'react'

interface LoadingOverlayProps {
  message?: string
}

export default function LoadingOverlay({ message = '読み込み中...' }: LoadingOverlayProps) {
  // スクロールを無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* ローディングコンテンツ */}
      <div className="relative bg-white rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          {/* アニメーションローダー */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" />
          </div>
          
          {/* メッセージ */}
          <p className="text-lg font-medium text-gray-900">{message}</p>
          
          {/* サブメッセージ */}
          <p className="text-sm text-gray-500">しばらくお待ちください</p>
          
          {/* プログレスバー */}
          <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-progress" />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 95%;
          }
        }
        
        .animate-progress {
          animation: progress 2s ease-out infinite;
        }
      `}</style>
    </div>
  )
}