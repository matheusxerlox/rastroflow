import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/axios'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyUser = () => {
      const storedUser = localStorage.getItem('rastroflow_user')
      const token = localStorage.getItem('rastroflow_token')
      
      if (storedUser && token) {
        try {
          setUser(JSON.parse(storedUser))
        } catch(e) {
          logout()
        }
      }
      setLoading(false)
    }
    
    verifyUser()

    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout()
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )

    return () => {
      api.interceptors.response.eject(interceptorId)
    }
  }, [])

  const login = async (email, password) => {
    // as per fastapi oauth2 spec
    const formData = new URLSearchParams()
    formData.append("username", email)
    formData.append("password", password)

    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    
    const { access_token, user: userData } = response.data
    localStorage.setItem('rastroflow_token', access_token)
    localStorage.setItem('rastroflow_user', JSON.stringify(userData))
    setUser(userData)
    
    // Auth interceptor will intercept 401 and redirect to login
    // Essa política agora está coberta no useEffect do contexto
    
    return userData
  }

  const logout = () => {
    localStorage.removeItem('rastroflow_token')
    localStorage.removeItem('rastroflow_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
