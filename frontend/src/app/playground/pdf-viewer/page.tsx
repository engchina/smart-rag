import React, {useState} from 'react'
import {FileText, Upload} from 'lucide-react'

import {BboxData} from "@/types/bbox.ts";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import PDFJSONLViewer from "@/components/PDFJSONLViewer.tsx";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar.tsx";
import {AppSidebar} from "@/components/app-sidebar.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb.tsx";

export const PDFViewerPage = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [jsonlFile, setJsonlFile] = useState<File | null>(null)
    const [jsonlData, setJsonlData] = useState<BboxData[]>([])
    const [isBothUploaded, setIsBothUploaded] = useState(false)
    const [pageNumber, setPageNumber] = useState(1)

    // 保持原有的文件上传处理逻辑...
    const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0]
            setPdfFile(file)
            setIsBothUploaded(!!jsonlFile)
            setPageNumber(1)
            // 重置文件输入的值，允许用户重新选择相同文件
            event.target.value = ''
            console.log('handlePdfUpload pageNumber: ', pageNumber)
        }
    }

    const handleJsonlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0]
            setJsonlFile(file)
            setIsBothUploaded(!!pdfFile)
            setPageNumber(1)
            console.log('handleJsonlUpload pageNumber: ', pageNumber)

            const reader = new FileReader()
            reader.onload = (e) => {
                const content = e.target?.result as string
                const lines = content.split('\n').filter(line => line.trim() !== '')
                lines.forEach((line, index) => {
                    try {
                        const parsedLine = JSON.parse(line)
                        // console.log(`Line ${index + 1}:`, parsedLine)
                        if (!parsedLine.detected_type) {
                            console.warn(`Line ${index + 1} is missing detected_type`)
                        }
                    } catch (error) {
                        console.error(`Error parsing line ${index + 1}:`, error)
                    }
                })

                const parsedData = lines.map(line => JSON.parse(line))
                // console.table(parsedData)
                setJsonlData(parsedData)
            }
            reader.readAsText(file)

            // 重置文件输入的值，允许用户重新选择相同文件
            event.target.value = ''
        }
    }


    return (
        <SidebarProvider>
            <AppSidebar/>
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
                    <div className="min-h-screen p-8">
                        <div className="flex justify-center space-x-4 mb-8">
                            {/* 文件上传组件 */}
                            <label
                                className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
                                <Upload className="mr-2"/>
                                Upload PDF
                                <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden"/>
                            </label>
                            <label
                                className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg cursor-pointer hover:bg-green-600">
                                <FileText className="mr-2"/>
                                Upload JSONL
                                <input type="file" accept=".jsonl" onChange={handleJsonlUpload} className="hidden"/>
                            </label>
                        </div>
                        {isBothUploaded && (
                            <ErrorBoundary>
                                <PDFJSONLViewer
                                    pdfFile={pdfFile!}
                                    jsonlData={jsonlData}
                                    pageNumber={pageNumber}
                                    onPageChange={setPageNumber}
                                />
                            </ErrorBoundary>
                        )}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}