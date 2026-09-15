// Example: Navbar component
export default function Navbar() {
  return (
    <nav className="bg-app-bg border-b border-app-border">
      <div className="max-w-screen-xl mx-auto px-8 py-5 flex items-center justify-between">
        <div className="font-semibold text-xl">Beacon Edu. Consult</div>

        <button className="px-5 py-2.5 bg-app-primary hover:bg-app-primary-hover text-white rounded-3xl text-sm font-semibold transition-colors">
          New Project
        </button>
      </div>
    </nav>
  );
}
