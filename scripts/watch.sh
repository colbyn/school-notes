set -e

watchexec --restart --exts tex --ignore dist/ -- 'npm start && echo "\n==reloaded==\n"'
