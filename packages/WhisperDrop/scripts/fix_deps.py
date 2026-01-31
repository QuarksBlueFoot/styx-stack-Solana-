
import json
import os
import glob

def fix_dependencies(file_path):
    with open(file_path, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print(f"Error decoding {file_path}")
            return

    changed = False
    
    for dep_type in ['dependencies', 'devDependencies', 'peerDependencies']:
        if dep_type in data:
            for pkg, version in data[dep_type].items():
                if pkg.startswith('@styx/') and version != "workspace:*":
                    print(f"Updating {pkg} in {file_path} from {version} to workspace:*")
                    data[dep_type][pkg] = "workspace:*"
                    changed = True

    if changed:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
            f.write('\n') # Add newline at end of file

def main():
    # Find all package.json files
    package_files = []
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in root:
            continue
        if 'package.json' in files:
            package_files.append(os.path.join(root, 'package.json'))

    # Exclude root package.json if it doesn't have deps (it might have devDeps)
    # Actually, root package.json is usually project root, might check it too but `workspace:*` is for consumers.
    # The root package.json probably doesn't consume the packages in that way, but if it does, it should also use workspace:*.
    
    for file_path in package_files:
        fix_dependencies(file_path)

if __name__ == "__main__":
    main()
