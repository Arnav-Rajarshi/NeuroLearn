import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage.jsx'

// Mock auth context
const mockNavigate = vi.fn()
const mockLogin = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    loading: false,
  }),
}))

vi.mock('../utils/api.js', () => ({
  loginUser: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage — Neural Ink UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the NeuroLearn brand mark', () => {
    renderLogin()
    expect(screen.getByText('NeuroLearn')).toBeInTheDocument()
  })

  it('renders email and password inputs with correct placeholders', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('password')).toBeInTheDocument()
  })

  it('renders the Sign In button', () => {
    renderLogin()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('renders the Spline iframe background', () => {
    renderLogin()
    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
    expect(iframe.src).toContain('spline.design')
  })

  it('renders the signup link', () => {
    renderLogin()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('renders the admin access link', () => {
    renderLogin()
    expect(screen.getByText('Admin access')).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    renderLogin()
    const passwordInput = screen.getByPlaceholderText('password')
    expect(passwordInput.type).toBe('password')

    // Find the eye toggle button (it's next to the password input)
    const toggleBtn = passwordInput.parentElement.querySelector('button')
    fireEvent.click(toggleBtn)
    expect(passwordInput.type).toBe('text')

    fireEvent.click(toggleBtn)
    expect(passwordInput.type).toBe('password')
  })

  it('shows error on failed login', async () => {
    renderLogin()
    const emailInput = screen.getByPlaceholderText('your email')
    const passwordInput = screen.getByPlaceholderText('password')
    const submitBtn = screen.getByText('Sign In')

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('has the neon input styling (inline styles)', () => {
    renderLogin()
    const emailInput = screen.getByPlaceholderText('your email')
    // Check inline style matches the neon design
    expect(emailInput.style.borderRadius).toBe('14px')
    expect(emailInput.style.fontSize).toBe('16px')
  })

  it('does not render any card/container wrapping the form', () => {
    renderLogin()
    // No dashboard-card class on form ancestors
    const form = document.querySelector('form')
    expect(form).toBeInTheDocument()
    let el = form.parentElement
    while (el) {
      expect(el.className).not.toContain('dashboard-card')
      el = el.parentElement
    }
  })
})