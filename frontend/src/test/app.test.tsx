import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STUDENT, makeClass, makeHold, mockApi, renderApp } from './helpers'

describe('student id bar', () => {
  it('only accepts a 17-digit id and remembers it after a reload', async () => {
    mockApi([
      { path: '/classes', body: [] },
      { path: '/me/holds', body: [] },
    ])
    const user = userEvent.setup()
    const { unmount } = renderApp()

    const input = screen.getByRole('textbox', { name: /student id/i })
    await user.type(input, '12ab34')
    expect(input).toHaveValue('1234')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/exactly 17 digits/i)

    await user.clear(input)
    await user.type(input, STUDENT)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByTestId('current-student-id')).toHaveTextContent(STUDENT)

    unmount()
    renderApp()
    expect(screen.getByTestId('current-student-id')).toHaveTextContent(STUDENT)
  })
})

describe('classes page', () => {
  it('shows seat counts and asks for a student id before applying', async () => {
    mockApi([
      { path: '/classes', body: [makeClass(), makeClass({ id: 'c_full', name: 'Class 7', availableSeats: 0, heldSeats: 10, confirmedSeats: 30 })] },
    ])
    const user = userEvent.setup()
    renderApp()

    const card = await screen.findByRole('article', { name: 'Class 6 - Morning Shift' })
    expect(within(card).getByTestId('available-seats')).toHaveTextContent('30')
    expect(within(screen.getByRole('article', { name: 'Class 7' })).getByRole('button', { name: 'No seats left' })).toBeDisabled()

    await user.click(within(card).getByRole('button', { name: 'Apply for a seat' }))
    expect(await screen.findByText(/enter the student id at the top/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /student id/i })).toHaveFocus()
  })

  it('reserves a seat and opens the application with a countdown', async () => {
    localStorage.setItem('admission.studentId', STUDENT)
    const hold = makeHold()
    const fetchMock = mockApi([
      { path: '/classes', body: [makeClass()] },
      { path: '/me/holds', body: [] },
      { method: 'POST', path: '/classes/c_one/holds', status: 201, body: hold },
      { path: '/holds/h_one', body: hold },
    ])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Apply for a seat' }))

    expect(await screen.findByText('Your seat is reserved')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/applications/h_one')
    expect(screen.getByRole('timer')).toHaveTextContent(/^0?[89]:\d\d$/)
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect((post[1]?.headers as Record<string, string>)['X-Student-Id']).toBe(STUDENT)
  })

  it('explains in plain words when the class is already full', async () => {
    localStorage.setItem('admission.studentId', STUDENT)
    mockApi([
      { path: '/classes', body: [makeClass()] },
      { path: '/me/holds', body: [] },
      { method: 'POST', path: '/classes/c_one/holds', status: 409, body: { error: 'NO_SEATS_AVAILABLE', message: 'No seats.' } },
    ])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Apply for a seat' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/all seats in this class are taken/i)
  })
})

describe('application page', () => {
  it('switches to expired by itself when the timer runs out', async () => {
    localStorage.setItem('admission.studentId', STUDENT)
    let calls = 0
    const soon = makeHold({ expiresAt: new Date(Date.now() + 1200).toISOString() })
    mockApi([{ path: '/holds/h_one', body: () => (++calls === 1 ? soon : { ...soon, status: 'EXPIRED' }) }])
    renderApp('#/applications/h_one')

    expect(await screen.findByText('Your seat is reserved')).toBeInTheDocument()
    expect(await screen.findByText('Time is up', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm admission/i })).not.toBeInTheDocument()
  })

  it('confirms admission after the fee is paid', async () => {
    localStorage.setItem('admission.studentId', STUDENT)
    let confirmed = false
    const hold = makeHold()
    mockApi([
      { path: '/holds/h_one', body: () => (confirmed ? { ...hold, status: 'CONFIRMED', confirmedAt: hold.serverTime } : hold) },
      { method: 'POST', path: '/holds/h_one/confirm', body: () => ((confirmed = true), { ...hold, status: 'CONFIRMED' }) },
    ])
    const user = userEvent.setup()
    renderApp('#/applications/h_one')

    await user.click(await screen.findByRole('button', { name: /i have paid/i }))

    expect(await screen.findByText('Admission confirmed')).toBeInTheDocument()
  })

  it('asks before cancelling and then releases the seat', async () => {
    localStorage.setItem('admission.studentId', STUDENT)
    let cancelled = false
    const hold = makeHold()
    mockApi([
      { path: '/holds/h_one', body: () => (cancelled ? { ...hold, status: 'CANCELLED', cancelledAt: hold.serverTime } : hold) },
      { method: 'DELETE', path: '/holds/h_one', status: 204, body: () => ((cancelled = true), null) },
    ])
    const user = userEvent.setup()
    renderApp('#/applications/h_one')

    await user.click(await screen.findByRole('button', { name: 'Cancel application' }))
    expect(cancelled).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Yes, cancel it' }))

    expect(await screen.findByText('Application cancelled')).toBeInTheDocument()
  })
})

describe('my applications', () => {
  it('lists active and past applications for the saved student', async () => {
    localStorage.setItem('admission.studentId', STUDENT)
    mockApi([
      {
        path: '/me/holds',
        body: [
          makeHold(),
          makeHold({ holdId: 'h_two', className: 'Class 8 - Day Shift', status: 'EXPIRED' }),
        ],
      },
    ])
    renderApp('#/applications')

    expect(await screen.findByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Past applications')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pay & confirm' })).toHaveAttribute('href', '#/applications/h_one')
    expect(screen.getByText('Class 8 - Day Shift')).toBeInTheDocument()
  })
})

describe('create class', () => {
  it('validates input and shows the duplicate-name error from the server', async () => {
    mockApi([
      { method: 'POST', path: '/classes', status: 409, body: { error: 'CLASS_ALREADY_EXISTS', message: 'exists' } },
    ])
    const user = userEvent.setup()
    renderApp('#/admin')

    await user.click(screen.getByRole('button', { name: 'Create class' }))
    expect(screen.getByText('Please enter a class name.')).toBeInTheDocument()
    expect(screen.getByText(/whole number from 1 to 10,000/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Class name'), 'Class 6 - Morning Shift')
    await user.type(screen.getByLabelText('Number of seats'), '40')
    await user.click(screen.getByRole('button', { name: 'Create class' }))

    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeInTheDocument())
  })

  it('creates a class', async () => {
    const fetchMock = mockApi([
      { method: 'POST', path: '/classes', status: 201, body: makeClass({ name: 'Class 9', totalSeats: 25 }) },
    ])
    const user = userEvent.setup()
    renderApp('#/admin')

    await user.type(screen.getByLabelText('Class name'), '  Class 9 ')
    await user.type(screen.getByLabelText('Number of seats'), '25')
    await user.click(screen.getByRole('button', { name: 'Create class' }))

    expect(await screen.findByText('Class created')).toBeInTheDocument()
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ name: 'Class 9', totalSeats: 25 })
  })
})
