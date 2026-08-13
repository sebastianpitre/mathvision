import {
    FaSearch,
    FaBell,
    FaBars
} from "react-icons/fa";

export default function Topbar() {

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-xl md:px-8">

            <div className="flex items-center gap-4">

                <button className="rounded-xl p-3 text-slate-300 hover:bg-slate-800 lg:hidden">

                    <FaBars />

                </button>

                <div>

                    <p className="hidden text-xs uppercase tracking-widest text-cyan-400 md:block">
                        Learning Universe
                    </p>

                    <h2 className="text-xl font-bold md:text-2xl">
                        Dashboard
                    </h2>

                </div>

            </div>

            <div className="flex items-center gap-3 md:gap-6">

                <div className="relative hidden md:block">

                    <FaSearch className="absolute left-4 top-4 text-slate-500" />

                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-48 rounded-full border border-slate-800 bg-slate-900 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-500 md:w-64"
                    />

                </div>

                <button className="relative rounded-xl p-3 text-slate-400 hover:bg-slate-900 hover:text-white">

                    <FaBell />

                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" />

                </button>

                <div className="flex items-center gap-3">

                    <img
                        src="https://i.pravatar.cc/100?img=12"
                        alt="Avatar"
                        className="h-10 w-10 rounded-full border-2 border-cyan-400/50"
                    />

                    <div className="hidden md:block">

                        <p className="text-sm font-bold">
                            Estudiante
                        </p>

                        <p className="text-xs text-slate-500">
                            Nivel 4
                        </p>

                    </div>

                </div>

            </div>

        </header>
    );
}