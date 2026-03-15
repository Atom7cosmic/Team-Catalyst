import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'

export const metadata = {
  title: 'OrgOS - AI-Powered Organization Operating System',
  description:
    'OrgOS is an AI-powered organization operating system that helps track performance, manage meetings, and get intelligent recommendations.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">

        {/* Global theme loader */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');

                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />

        <AuthProvider>
          {children}

          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-card text-foreground',
              duration: 4000,
            }}
          />
        </AuthProvider>

      </body>
    </html>
  )
}