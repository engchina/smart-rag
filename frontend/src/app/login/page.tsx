import {useNavigate} from 'react-router-dom'
import React, {useState} from 'react'
import {LoginForm} from '@/components/login-form'

export default function LoginPage() {
    const navigate = useNavigate()
    const [error, setError] = useState('')

    const handleLogin = (username: string, password: string) => {
        // 硬编码验证逻辑
        if (username === 'admin' && password === '123456') {
            localStorage.setItem('isAuthenticated', 'true')
            navigate('/')
        } else {
            setError('Invalid username or password')
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md">
                <LoginForm
                    onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        handleLogin(
                            formData.get('username') as string,
                            formData.get('password') as string
                        )
                    }}
                    error={error}
                />
            </div>
        </div>
    )
}