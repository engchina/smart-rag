import React, {useMemo} from 'react'
import DOMPurify from 'dompurify'
import {BboxData} from "@/types/bbox.ts";


interface JSONLViewerProps {
    data: BboxData[]
    onSelectBbox: (bbox: BboxData) => void
    selectedBbox: BboxData | null
    currentPage: number
    height: number
}

const JSONLDataViewer: React.FC<JSONLViewerProps> = ({data, onSelectBbox, selectedBbox, currentPage, height}) => {
    const filteredData = useMemo(() => data.filter(item => item.page === currentPage), [data, currentPage])

    return (
        <div
            className="overflow-auto border border-gray-300 rounded"
            style={{height: `${height}px`}}
        >
            {/*<div className="jsonl-viewer overflow-auto h-[800px] border border-gray-300 rounded">*/}
            <table className="table-fixed">
                <thead>
                <tr className="bg-gray-100">
                    <th className="w-[3vw] py-2 break-words whitespace-normal">Page No</th>
                    <th className="w-[3vw] py-2 break-words whitespace-normal">Seq No</th>
                    <th className="w-[20vw] py-2 break-words whitespace-normal">Sentence</th>
                    <th className="w-[5vw] py-2 break-words whitespace-normal">Detected Type</th>
                    <th className="w-[4vw] py-2 break-words whitespace-normal">Type</th>
                </tr>
                </thead>
                <tbody>
                {filteredData.map((item) => (
                    <JSONLRow
                        key={item.id}
                        item={item}
                        isSelected={selectedBbox?.id === item.id}
                        onSelect={onSelectBbox}
                    />
                ))}
                </tbody>
            </table>
        </div>
    )
}

interface JSONLRowProps {
    item: BboxData
    isSelected: boolean
    onSelect: (bbox: BboxData) => void
}

const JSONLRow: React.FC<JSONLRowProps> = React.memo(({item, isSelected, onSelect}) => {
    return (
        <tr
            className={`cursor-pointer ${isSelected ? 'bg-yellow-200 hover:bg-yellow-200' : 'hover:bg-gray-100'}`}
            onClick={() => onSelect(item)}
        >
            <td className="border w-[3vw] px-2 py-2 break-words whitespace-normal">{item.page}</td>
            <td className="border w-[3vw] px-2 py-2 break-words whitespace-normal">{item.seq_no}</td>
            <td
                className="border w-[24vw] px-2 py-2 break-words whitespace-normal"
                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(item.sentence)}}
            />
            <td className="border w-[5vw] px-2 py-2 break-words whitespace-normal">{item.detected_type}</td>
            <td className="border w-[4vw] px-2 py-2 break-words whitespace-normal">{item.type}</td>
        </tr>
    )
})

export default JSONLDataViewer