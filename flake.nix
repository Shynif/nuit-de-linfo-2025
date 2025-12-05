{
  description = "Notre site pour la nuit de l'info 2025";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    {
      self,
      nixpkgs,
    }:
    let
      # Pas testé sur mac
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixpkgs-fmt);

      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          # Un package nix !
          default = pkgs.callPackage ./default.nix { };
          # Si vous voulez construire une image OCI pour Docker/Podman/n'importe quoi
          default-oci = pkgs.dockerTools.streamLayeredImage {
            name = "test";
            contents = default;

            config.cmd = [ "/bin/my-svelte-app" ];
          };
        }
      );

      defaultPackage = forAllSystems (system: self.packages.${system}.qemu-nrv);
    };
}
