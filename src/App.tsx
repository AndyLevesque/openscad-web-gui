import { styled } from '@mui/material';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';

import ErrorBox from './components/ErrorBox';
import Workspace from './components/Workspace';
import { useFileSystemProvider } from './components/providers/FileSystemProvider';
import WorkspaceProvider from './components/providers/WorkspaceProvider';
import useImport from './hooks/useImport';
import useUrlFileWriter from './hooks/useUrlFileWriter';
import commonLibraries from './etc/libraries.json';
import scadSources from './etc/scad-sources.json'; // Import scad-sources.json


const MyBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: '50vw',
  maxWidth: '50vw',
}));

export default function App() {
  const importUrl = getImportUrl();

  const { error, isLoading } = useImport(importUrl, true);
  const { files } = useFileSystemProvider();
  const { write, isLoading: isWriting } = useUrlFileWriter();
  const [isAvailable, setAvailable] = React.useState({});

  React.useEffect(() => {
    const downloadLibraries = async () => {
      for (const lib of commonLibraries) {
        if (lib.downloadOnInit && !isAvailable[lib.url]) {
          await write(lib.url, (fileName) => {
            return 'libraries/' + lib.name + fileName.replace(lib.trimFromStartPath, '');
          });
          setAvailable((prev) => ({ ...prev, [lib.url]: true }));
        }
      }
    };

    const loadScadFiles = async () => {
      const fetchScadFiles = async (apiUrl, branch) => {
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const files = await response.json();

          for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.scad')) {
              await write(file.download_url, (fileName) => {
                const scrubbedFileName = fileName.split('/').pop();
                return scrubbedFileName;
              });
            } else if (file.type === 'dir') {
              await fetchScadFiles(`${file.url}?ref=${branch}`, branch);
            }
          }
        } catch (error) {
          console.error(`Failed to load SCAD files from ${apiUrl}:`, error);
        }
      };

      for (const source of scadSources.sources) {
        if (source.includes('github.com')) {
          // Parse the GitHub URL to extract owner, repo, branch, and path
          //TODO Fix errors generated when the directory provided is the root of the repository
          const githubUrlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)\/?(.*))?$/;
          const match = source.match(githubUrlPattern);

          if (match) {
            const owner = match[1];
            const repo = match[2];
            const branch = match[3] || 'main'; // Assume main branch if not defined
            const path = match[4] || '';

            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

            await fetchScadFiles(apiUrl, branch);
          } else {
            console.error(`Invalid GitHub URL: ${source}`);
          }
        }
      }
    };

    const init = async () => {
      await downloadLibraries();
      if (!importUrl) {
        await loadScadFiles();
      }
    };

    init();
  }, []);

  // Show a loading indicator during the import.
  if (isLoading || isWriting) {
    return (
      <MyBox>
        <CircularProgress sx={{ marginLeft: '50%' }} />
      </MyBox>
    );
  }

  // Show an error message if the import failed.
  if (error) {
    return (
      <MyBox>
        <ErrorBox error={error} />
      </MyBox>
    );
  }

  if (importUrl && files.length === 0) {
    return (
      <MyBox>
        <ErrorBox error={new Error(`No files found at ${importUrl}`)} />
      </MyBox>
    );
  }

  return (
    <WorkspaceProvider>
      <Workspace initialMode={importUrl ? 'customizer' : 'customizer'} />
    </WorkspaceProvider>
  );
}

function getImportUrl(): string | undefined {
  let search = window.location.search;

  // Trim the leading question mark
  if (search.startsWith('?')) {
    search = search.substring(1);
  }

  // If the search string is an url, load it through the fetcha.
  if (search.startsWith('http')) {
    return decodeURIComponent(search);
  }
}
