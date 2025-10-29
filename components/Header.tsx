interface HeaderProps {
  onOpenSettings: () => void;
}

const Header = ({ onOpenSettings }: HeaderProps) => {
  return (
    <header className="bg-gray-800 shadow-lg shadow-blue-500/10">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
               <svg className="h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V4C20 2.9 19.1 2 18 2ZM9.5 18H7.5V16.5H9.5V18ZM9.5 14.5H7.5V13H9.5V14.5ZM9.5 11.5H7.5V10H9.5V11.5ZM13.09 10.35L11.5 12.18V12.5H12.82L14.41 10.65L13.09 10.35ZM15.03 8.04L13.5 9.8L12.18 9.5L13.77 7.65L15.03 8.04Z" />
                  <path fillRule="evenodd" d="M14.85 3.56L15.85 4.56L16.27 4.14C16.66 3.75 17.3 3.75 17.69 4.14L18.86 5.31C19.25 5.7 19.25 6.34 18.86 6.73L18.44 7.15L19.44 8.15L20.44 7.15C21.22 6.37 21.22 5.1 20.44 4.32L18.68 2.56C17.9 1.78 16.63 1.78 15.85 2.56L14.85 3.56Z" clipRule="evenodd" />
               </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">경평제목생성기</h1>
          </div>
          <div className="flex items-center">
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-label="Settings"
            >
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;