import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { shadcn } from '@clerk/themes';
import * as Sentry from '@sentry/nextjs';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import camelcaseKeys from 'camelcase-keys';

import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Ubuntu, Montserrat } from 'next/font/google';
import * as React from 'react';

import DevelopmentBanner from '@/components/layout/development-banner';
import Sidebar from '@/components/layout/sidebar';
import ConfirmProvider from '@/components/providers/confirm-provider';
import DocumentProvider from '@/components/providers/document-provider';
import LexicalExtensionComposerProvider from '@/components/providers/lexical-extension-composer-provider';
import SidebarProvider from '@/components/providers/sidebar-provider';
import Toaster from '@/components/ui/sonner';
import createClerkSupabaseSsrClient from '@/lib/utils/create-clerk-supabase-ssr-client';

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  width: 'device-width',
};

const ubuntu = Ubuntu({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-ubuntu',
  weight: ['300', '400', '500', '700'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  description: 'LLM-powered rich text editor',
  title: 'Rich Smartext Editor',
};

async function getAuthState() {
  try {
    const { isAuthenticated, userId } = await auth();

    return { isAuthenticated, userId };
  } catch (error) {
    if (error instanceof Error && error.message.includes('clerkMiddleware()')) {
      return { isAuthenticated: false, userId: null };
    }

    throw error;
  }
}

const getDocuments = React.cache(async (userId: string | null) => {
  if (!userId) {
    return {
      documents: [],
      error: null,
    };
  }

  try {
    const client = await createClerkSupabaseSsrClient();
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      Sentry.captureException(error);

      return {
        documents: [],
        error,
      };
    }

    return {
      documents: camelcaseKeys(data || []),
      error: null,
    };
  } catch (error) {
    Sentry.captureException(error);

    return {
      documents: [],
      error,
    };
  }
});

export default function RootLayout({ children }: Readonly<React.PropsWithChildren>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ubuntu.variable} ${montserrat.className} ${montserrat.variable} h-screen antialiased`}>
        <ThemeProvider enableSystem attribute="class" defaultTheme="system" disableTransitionOnChange>
          <ClerkProvider appearance={{ cssLayerName: 'clerk', theme: shadcn, variables: { fontSize: { lg: '18px' } } }}>
            <ConfirmProvider>
              <LexicalExtensionComposerProvider>
                <DocumentsProvider>{children}</DocumentsProvider>
              </LexicalExtensionComposerProvider>
            </ConfirmProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function DocumentsProvider({ children }: Readonly<React.PropsWithChildren>) {
  const { isAuthenticated, userId } = await getAuthState();
  const { documents, error } = await getDocuments(userId);

  return (
    <DocumentProvider documents={documents} isAuthenticated={isAuthenticated}>
      <SidebarProvider>
        <div className="bg-background relative flex h-full flex-col overflow-hidden">
          <DevelopmentBanner />
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <Sidebar documents={documents} isDocumentsError={!!error} isAuthenticated={isAuthenticated} />
            <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
          </div>
          <Analytics />
          <SpeedInsights />
          <Toaster richColors closeButton duration={10_000} />
        </div>
      </SidebarProvider>
    </DocumentProvider>
  );
}
