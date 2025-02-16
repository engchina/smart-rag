import { useEffect, useRef, useState } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Message } from "@/types/chat.ts"
import { fetchChatResponse } from "@/services/openaiService.ts"
import { ClientError, NetworkError, ServerError } from "@/types/error.ts"

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [isCopied, setIsCopied] = useState<boolean[]>([])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
        setIsCopied(new Array(messages.length).fill(false))
    }, [messages])

    const handleSendMessage = async () => {
        if (input.trim() === '' || isLoading) return

        const newMessage: Message = { role: 'user', content: input.trim() }
        setMessages(prev => [...prev, newMessage])
        setInput('')
        setIsLoading(true)

        try {
            const stream = await fetchChatResponse([...messages, newMessage])
            if (!stream) throw new Error('Failed to get stream')

            const reader = stream.getReader()
            const decoder = new TextDecoder()
            let accumulatedData = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                accumulatedData += decoder.decode(value, { stream: true })
                const lines = accumulatedData.split('\n')
                accumulatedData = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6)
                        if (data === '[DONE]') break

                        try {
                            const json = JSON.parse(data)
                            if (json.choices?.[0]?.delta?.content) {
                                setMessages(prev => {
                                    const last = prev[prev.length - 1]
                                    return last?.role === 'assistant'
                                        ? [...prev.slice(0, -1), {
                                            ...last,
                                            content: last.content + json.choices[0].delta.content
                                        }]
                                        : [...prev, { role: 'assistant', content: json.choices[0].delta.content }]
                                })
                            }
                        } catch (e) {
                            console.error('JSON parse error:', e)
                        }
                    }
                }
            }
        } catch (error) {
            let errorMessage = 'An error occurred. Please try again.'
            if (error instanceof NetworkError) {
                errorMessage = 'Network error. Check your connection.'
            } else if (error instanceof ClientError) {
                errorMessage = `Client error: ${error.message}`
            } else if (error instanceof ServerError) {
                errorMessage = 'Server error. Please try later.'
            }
            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleCopy = (content: string, index: number) => {
        navigator.clipboard.writeText(content).then(() => {
            const newCopied = [...isCopied]
            newCopied[index] = true
            setIsCopied(newCopied)
            setTimeout(() => {
                newCopied[index] = false
                setIsCopied([...newCopied])
            }, 2000)
        })
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="flex h-full flex-col">
                    {/* 消息区域 */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800'
                                    }`} style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                        <button
                                            onClick={() => handleCopy(msg.content, index)}
                                            className={`absolute right-2 top-2 text-sm ${
                                                isCopied[index] ? 'text-green-500' : 'text-gray-400'
                                            }`}
                                        >
                                            {isCopied[index] ? '✓' : '⎘'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className="border-t p-4">
                        <div className="relative">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入消息..."
                                className="w-full rounded-lg border bg-background px-4 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={Math.min(4, Math.max(1, input.split('\n').length))}
                                disabled={isLoading}
                                style={{ resize: 'none', overflow: 'hidden' }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !input.trim()}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 transform ${
                                    isLoading ? 'text-gray-400' : 'text-primary hover:text-blue-600'
                                }`}
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}