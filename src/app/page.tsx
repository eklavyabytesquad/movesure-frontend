import CommonNavbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <CommonNavbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Welcome to <span className="text-blue-600">MoveSure</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            The smarter way to manage your moving business.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 text-white bg-blue-600 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/auth/register"
              className="px-6 py-3 text-blue-600 border border-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
            >
              Register your company
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
