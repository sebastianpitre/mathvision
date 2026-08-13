import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import AnimatedBackground from "../components/common/AnimatedBackground";

export default function MainLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-950 text-white">

            <AnimatedBackground />

            <div className="relative flex min-h-screen">

                <Sidebar />

                <div className="min-w-0 flex-1">

                    <Topbar />

                    <main className="p-4 md:p-6 lg:p-8">

                        {children}

                    </main>

                </div>

            </div>

        </div>
    );
}