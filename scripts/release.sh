set -e
rm -rf docs
npm run release
git add docs
git commit -m "publish changes online"
git push