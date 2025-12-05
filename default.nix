{
  stdenv,
  nodejs,
  pnpm,
  makeWrapper,
  lib,
  srcOnly,
  removeReferencesTo,
  python3
}:
let 
  nodeSources = srcOnly nodejs;
in
stdenv.mkDerivation (finalAttrs: {
  pname = "foo";
  version = "0.0.1";

  src = ./.;

  nativeBuildInputs = [
    nodejs
    pnpm.configHook
    makeWrapper
    python3
  ];

  buildInputs = [

  ];

  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 2;
    hash = "sha256-WZF5bknG8QhDWAqliHB/xeYGw9reuR1k86ynAQZLKiw=";
  };


    # Much love to https://github.com/NixOS/nixpkgs/blob/0728c6f711049766270faadfb483f1e5ee42f055/pkgs/by-name/ta/taler-wallet-core/package.nix#L84
  preBuild = ''
    for f in $(find -path '*/node_modules/better-sqlite3' -type d); do
      (cd "$f" && (
      npm run build-release --offline --nodedir="${nodeSources}"
      find build -type f -exec \
        ${lib.getExe removeReferencesTo} \
        -t "${nodeSources}" {} \;
      ))
    done
  '';

  buildPhase = ''
    runHook preBuild
    pnpm build


    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/lib/my-svelte-app
    cp -r build/* $out/lib/my-svelte-app
    cp package.json $out/lib/my-svelte-app
    cp -r node_modules $out/lib/my-svelte-app

    mkdir -p $out/bin
    makeWrapper ${nodejs}/bin/node $out/bin/my-svelte-app \
      --add-flags "$out/lib/my-svelte-app/index.js"

    runHook postInstall
  '';

  meta.mainProgram = "my-svelte-app";
})
