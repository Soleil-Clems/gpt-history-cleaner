function App() {
  return (
    <div className="w-[320px] p-6 bg-gradient-to-br from-indigo-50 to-purple-50">

      <div className="flex items-center gap-3 mb-6">
        <img 
          src="/logo.png" 
          alt="GPT History Cleaner" 
          className="w-12 h-12 rounded-lg"
        />
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            GPT History Cleaner
          </h1>
          <p className="text-sm text-green-600 font-medium">✓ Active</p>
        </div>
      </div>

  
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-4">
        <p className="text-sm text-gray-700 mb-3">
          Pour utiliser l'extension :
        </p>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <span className="text-indigo-600 font-semibold">1.</span>
            <p className="text-sm text-gray-600">
              Allez sur{" "}
              <a
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-semibold hover:underline"
              >
                chatgpt.com
              </a>
            </p>
          </div>

          <div className="flex gap-2">
            <span className="text-indigo-600 font-semibold">2.</span>
            <p className="text-sm text-gray-600">
              Ouvrez la barre latérale gauche
            </p>
          </div>

          <div className="flex gap-2">
            <span className="text-indigo-600 font-semibold">3.</span>
            <p className="text-sm text-gray-600">
              Activez le mode sélection
            </p>
          </div>

          <div className="flex gap-2">
            <span className="text-indigo-600 font-semibold">4.</span>
            <p className="text-sm text-gray-600">
              Sélectionnez et supprimez vos conversations
            </p>
          </div>
        </div>
      </div>


      <p className="text-xs text-gray-500 text-center">
        Besoin d'aide ?{" "}
        <a
          href="https://soleil-ouisol.fr/#contact"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          Contactez-moi
        </a>
      </p>
    </div>
  );
}

export default App;