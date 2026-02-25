# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs }: {
  # Which nixpkgs channel to use.
  channel = "stable-25.05"; # or "unstable"
  # services.docker.enable = true;
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_24
    # pkgs.zulu
    pkgs.python312
    pkgs.python312Packages.pip
    pkgs.uv
    pkgs.lldap
    pkgs.lldap-cli
    pkgs.openssl
    pkgs.github-copilot-cli
    # pkgs.prisma
  ];
  # Sets environment variables in the workspace
  env = {
    CODEX_HOME = "${builtins.getEnv "HOME"}/studio/.codex";
    XDG_CONFIG_HOME = "${builtins.getEnv "HOME"}/studio/.copilot";
    DATABASE_URL = "file:./data/data.db";
  };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "ms-vscode.vscode-typescript-next"
      "prisma.prisma"
      "redhat.vscode-yaml"
      "openai.chatgpt"
      "google.geminicodeassist"
      "redhat.vscode-xml"
      "github.copilot"
    ];
    workspace = {
      onCreate = {
        npm-install = "npm install -g @google/gemini-cli@latest @openai/codex@latest; exit;";
      };
      onStart = {
        npm-install = "npm install -g @google/gemini-cli@latest @openai/codex@latest; exit;";
        # ldap = "lldap run";
      };
    };
    # Enable previews and customize configuration
    previews = {
      enable = false;
      previews = {
        web = {
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0" ];
          manager = "web";
        };
      };
    };
  };
}
