import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rastroflow_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const detail = error?.response?.data?.detail || ''

    // Se o backend retornar 401 (token inválido) ou 403 de plano/bloqueio → desloga
    if (status === 401 || (status === 403 && !detail.includes('privileges'))) {
      localStorage.removeItem('rastroflow_token')
      localStorage.removeItem('rastroflow_user')
      // Redireciona para login. Se já estiver lá, não faz nada.
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
