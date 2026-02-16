// 生成 Casdoor 登录 URL
export const getCasdoorLoginUrl = () => {
  const clientId = import.meta.env.VITE_CASDOOR_CLIENT_ID || '5796e842363af6aa879d'
  const redirectUri = `${window.location.origin}/api/v1/casdoor/callback`
  const state = Math.random().toString(36).substring(2)

  // 直接跳转到 Casdoor 登录页面
  return `http://localhost:10011/login/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read&state=${state}`
}

// 跳转到 Casdoor 登录
export const loginWithCasdoor = () => {
  const loginUrl = getCasdoorLoginUrl()
  window.location.href = loginUrl
}
