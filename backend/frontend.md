npx create-next-app@latest . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"

npm uninstall react react-dom

# Then install React 18
npm install react@18 react-dom@18

# Now install the dependencies
npm install axios swr react-query @headlessui/react @heroicons/react date-fns recharts


wait we need to update our setup-vm.sh to include all the frontend dependecy things npm install react@18 react-dom@18  # Now install the dependencies npm install axios swr react-query @headlessui/react @heroicons/react date-fns recharts  this is what i installed in my frontedn 