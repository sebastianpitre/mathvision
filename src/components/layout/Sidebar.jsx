import { FaHome, FaGamepad, FaUserGraduate, FaCog } from "react-icons/fa";

export default function Sidebar(){

    return(

        <aside className="w-72 min-h-screen bg-slate-900 border-r border-slate-800">

            <div className="text-center py-8">

                <h1 className="text-3xl font-bold text-cyan-400">

                    MathVision

                </h1>

            </div>

            <nav>

                <ul className="space-y-2 px-4">

                    <li>

                        <a href="#" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800 transition">

                            <FaHome/>

                            Dashboard

                        </a>

                    </li>

                    <li>

                        <a href="#" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800 transition">

                            <FaGamepad/>

                            Juegos

                        </a>

                    </li>

                    <li>

                        <a href="#" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800 transition">

                            <FaUserGraduate/>

                            Perfil

                        </a>

                    </li>

                    <li>

                        <a href="#" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800 transition">

                            <FaCog/>

                            Configuración

                        </a>

                    </li>

                </ul>

            </nav>

        </aside>

    )

}