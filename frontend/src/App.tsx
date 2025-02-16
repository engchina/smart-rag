import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom'

import Page from "@/app/dashboard/page.tsx";

import ChatPage from "@/app/playground/chat/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import {JSX} from "react";
import {PDFViewerPage} from "@/app/playground/pdf-viewer/page.tsx";

// 路由守卫组件
const AuthRoute = ({children}: { children: JSX.Element }) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
    return (
        <Router>
            {/*<div className="h-screen w-screen">*/}
            <Routes>
                {/* 公开路由 */}
                <Route path="/login" element={<LoginPage/>}/>

                {/* 需要授权的路由 */}
                <Route path="/" element={<AuthRoute><Page/></AuthRoute>}/>
                <Route path="/dashboard" element={<AuthRoute><Page/></AuthRoute>}/>
                <Route path="/playground/chat" element={<AuthRoute><ChatPage/></AuthRoute>}/>
                <Route path="/playground/pdf-viewer" element={<AuthRoute><PDFViewerPage/></AuthRoute>}/>


                {/* 默认重定向 */}
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
            {/*</div>*/}
        </Router>
    )
}

export default App
