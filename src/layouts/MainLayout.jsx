import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

export default function MainLayout({children}){

    return(

        <div className="min-h-screen bg-slate-950 text-white">

            <div className="flex">

                <Sidebar/>

                <div className="flex-1">

                    <Topbar/>

                    <main className="p-8">

                        {children}

                    </main>

                </div>

            </div>

        </div>

    )

}