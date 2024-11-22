import DownloadIcon from '@mui/icons-material/Download';
import LoopIcon from '@mui/icons-material/Loop';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import React from 'react';

import commonLibraries from '../../etc/libraries.json';
import useUrlFileWriter from '../../hooks/useUrlFileWriter';
import Bytes from '../Bytes';

export default function Libraries() {
  const { write, isLoading } = useUrlFileWriter();
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
    downloadLibraries();
  }, []);

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const url = event.currentTarget.dataset.url;
    const trimFromStartPath = event.currentTarget.dataset.trimFromStartPath;
    const path = event.currentTarget.dataset.path;

    await write(url, (fileName) => {
      return 'libraries/' + path + fileName.replace(trimFromStartPath, '');
    });

    setAvailable({ ...isAvailable, [url]: true });
  };

  const libraryIsAlreadyDownloaded = (lib) => {
    return isAvailable[lib.url];
  };

  return (
    <>
      <Alert severity="info">
        <AlertTitle>Libraries</AlertTitle>
        Select which common libraries to include in your project. You can use
        your own through the file system manager.
      </Alert>
      <List>
        {commonLibraries.map((lib) => (
          <ListItem
            key={lib.name}
            secondaryAction={
              isAvailable && (
                <IconButton
                  edge="end"
                  aria-label="download library"
                  onClick={handleDownload}
                  disabled={libraryIsAlreadyDownloaded(lib)}
                  data-url={lib.url}
                  data-path={lib.name}
                  data-trim-from-start-path={lib.trimFromStartPath}
                >
                  {isLoading[lib.url] ? (
                    <LoopIcon sx={{ animation: 'spin 2s linear infinite' }} />
                  ) : (
                    <DownloadIcon />
                  )}
                </IconButton>
              )
            }
          >
            <ListItemText
              primary={
                <p>
                  {lib.name}{' '}
                  <i>
                    <Bytes bytes={lib.size} />
                  </i>
                </p>
              }
              secondary={lib.description}
            />
          </ListItem>
        ))}
      </List>
    </>
  );
}
