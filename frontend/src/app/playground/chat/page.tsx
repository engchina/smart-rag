import { useEffect, useRef, useState } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar"
import { Message } from "@/types/chat.ts"
import { fetchChatResponse } from "@/services/openaiService.ts"
import { ClientError, NetworkError, ServerError } from "@/types/error.ts"
import {Separator} from "@/components/ui/separator.tsx";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList, BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb.tsx";

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null); // 创建 inputRef

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (!isLoading) { // 确保在消息加载完成后聚焦
            inputRef.current?.focus();
        }
    }, [isLoading]); // 监听 isLoading 状态

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

            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '' }]); // Add empty assistant message

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
            let errorMessage = 'An error occurred. Please try again.';
            if (error instanceof NetworkError) {
                errorMessage = 'Network error. Check your connection.';
            } else if (error instanceof ClientError) {
                errorMessage = `Client error: ${error.message}`;
            } else if (error instanceof ServerError) {
                errorMessage = 'Server error. Please try later.';
            } else {
                errorMessage = `Unexpected error: ${error}`; // More informative error message
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
            setCopiedMessageIndex(index);
            setTimeout(() => {
                setCopiedMessageIndex(null);
            }, 2000)
        })
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header
                    className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1"/>
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">
                                        Playground
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block"/>
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Chat</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex h-full flex-col">
                    {/* 消息区域 */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index}
                                     className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800'
                                    }`} style={{wordWrap: 'break-word', overflowWrap: 'break-word'}}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                        <button
                                            onClick={() => handleCopy(msg.content, index)}
                                            className={`absolute right-2 top-2 text-sm ${
                                                copiedMessageIndex === index ? 'text-green-500' : 'text-gray-400'
                                            }`}
                                        >
                                            {copiedMessageIndex === index ? '✓' : '⎘'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef}/>
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className="border-t p-4">
                        <div className="relative">
                            <textarea
                                ref={inputRef} // 关联 inputRef
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask ..."
                                className="w-full rounded-lg border bg-background px-4 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={Math.min(4, Math.max(1, input.split('\n').length))}
                                disabled={isLoading}
                                style={{resize: 'none', overflow: 'hidden'}}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !input.trim()}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 transform ${
                                    isLoading ? 'text-gray-400' : 'text-primary hover:text-blue-600'
                                }`}
                            >
                                {isLoading ? (
                                    <div
                                        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
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