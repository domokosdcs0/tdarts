'use client';

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-base-200">
      {/* Hero Szekció */}
      <section className="bg-primary/90 backdrop-blur-md text-primary-content py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Üdvözöl a tDarts!
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Kezeld klubjaidat, indíts versenyeket, kövesd a statisztikákat és irányítsd a tornákat élőben, teljesen automatizáltan!
          </p>
          <Link href="/createTournament">
            <button className="btn btn-secondary btn-lg">
              Kezdj most!
            </button>
          </Link>
        </div>
      </section>

      {/* Funkciók Szekció */}
      <section className="py-16 bg-base-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12 text-base-content">
            Miért válaszd a tDarts torna kezelőt?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Klubkezelés */}
            <div className="card bg-base-200 shadow-xl p-6">
              <div className="card-body">
                <h3 className="card-title text-xl">Klubok kezelése</h3>
                <p className="text-base-content/70">
                  Hozz létre és kezelj klubokat, rendeld hozzájuk a játékosokat, és tartsd kézben az összes adatot egy helyen.
                </p>
              </div>
            </div>
            {/* Verseny indítás */}
            <div className="card bg-base-200 shadow-xl p-6">
              <div className="card-body">
                <h3 className="card-title text-xl">Versenyek indítása</h3>
                <p className="text-base-content/70">
                  Indíts tornákat egyszerűen, adj hozzá játékosokat, és hagyd, hogy a rendszer kezelje a többit.
                </p>
              </div>
            </div>
            {/* Statisztikák */}
            <div className="card bg-base-200 shadow-xl p-6">
              <div className="card-body">
                <h3 className="card-title text-xl">Statisztikák követése</h3>
                <p className="text-base-content/70">
                  Kövesd a játékosok teljesítményét, meccsstatisztikáit és rangsorait valós időben.
                </p>
              </div>
            </div>
            {/* Automatizált működés */}
            <div className="card bg-base-200 shadow-xl p-6">
              <div className="card-body">
                <h3 className="card-title text-xl">Teljes automatizáció</h3>
                <p className="text-base-content/70">
                  A csoportgenerálástól a meccsek levezetéséig minden automatikus, így neked csak a játékra kell koncentrálnod.
                </p>
              </div>
            </div>
            {/* Táblák integrációja */}
            <div className="card bg-base-200 shadow-xl p-6">
              <div className="card-body">
                <h3 className="card-title text-xl">Táblák csatlakoztatása</h3>
                <p className="text-base-content/70">
                  Csatlakoztasd a táblákat a tornához, a rendszer kezeli a csoportokat és mutatja, ki kivel játszik.
                </p>
              </div>
            </div>
            {/* Élő követés */}
            <div className="card bg-base-200 shadow-xl p-6">
              <div className="card-body">
                <h3 className="card-title text-xl">Élő követés</h3>
                <p className="text-base-content/70">
                  Nézd valós időben a meccseket, állásokat és eredményeket bárhonnan, bármikor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Szekció */}
      <section className="bg-primary/90 backdrop-blur-md text-primary-content py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-semibold mb-4">
            Készen állsz a saját tornádra?
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto">
            Csatlakozz most, és tapasztald meg a legmodernebb torna kezelést!
          </p>
          <Link href="/clubs">
            <button className="btn btn-secondary btn-lg">
              Tornát indítok!
            </button>
          </Link>
        </div>
      </section>

      {/* Lábléc */}
      <footer className="bg-base-300 py-8">
        <div className="container mx-auto px-4 text-center text-base-content/70">
          <p>&copy; 2025 tDarts. Minden jog fenntartva.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-primary">
              Adatvédelem
            </Link>
            <Link href="/terms" className="hover:text-primary">
              Felhasználási feltételek
            </Link>
            <Link href="/contact" className="hover:text-primary">
              Kapcsolat
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}