import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Alert, AlertTitle, SelectChangeEvent } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import { MuiChipsInput } from 'mui-chips-input';
import React, { useMemo } from 'react';
import { useFileSystemProvider } from '../providers/FileSystemProvider';
import { useWorkspaceProvider } from '../providers/WorkspaceProvider';
import FileSelector from './FileSystem/FileSelector';

import { Parameter } from '../../lib/openSCAD/parseParameter';

type Parameters = Parameter[];

type Props = {
  parameters: Parameters;
  onChange: (parameters: Parameters) => void;
};

const validateNumber = (value) => {
  if (isNaN(Number(value))) {
    return { isError: true, textError: 'Input must be a number' };
  }
  return true;
};

const validateBoolean = (value) => {
  if (value !== 'true' && value !== 'false') {
    return {
      isError: true,
      textError: `Input must be a boolean (i.e. 'true' or 'false')`,
    };
  }
  return true;
};

export default function Customizer({ parameters, onChange }: Props) {
  const { code, setCode, selectedFile, setSelectedFile } = useWorkspaceProvider();
  const { files } = useFileSystemProvider();
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);

  React.useEffect(() => {
    if (selectedFile) {
      const file = files.find((f) => f.path === selectedFile);
      if (file) {
        document.title = `OpenSCAD Web GUI - ${file.name}`; // Update page title on init
      }
    }
  }, [selectedFile, files]);

  // Filter out files that start with 'libraries'
  const filteredFiles = files.filter((file) => {
    const normalizedPath = file.path.replace(/\\/g, '/');
    return !normalizedPath.includes('libraries/');
  });

  // Load the selected file
  const handleFileSelect = (event: SelectChangeEvent<string>) => {
    const file = files.find((f) => f.path === event.target.value);

    if (file) {
      (async () => {
        setCode(await file.text());
        setSelectedFile(file.path);
        document.title = `OpenSCAD Web GUI - ${file.name}`; // Update page title
        setSnackbarOpen(true); // Show snackbar
      })();
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const changeParameter = (name: string, newValue?) => {
    const newParameters = parameters.map((parameter) => {
      if (parameter.name === name) {
        if (parameter.type === 'number') {
          newValue = Number(newValue);
        } else if (parameter.type === 'boolean') {
          newValue = Boolean(newValue);
        } else if (parameter.type === 'number[]') {
          newValue = newValue.map(Number);
        } else if (parameter.type === 'boolean[]') {
          newValue = newValue.map((v) => v === 'true');
        }

        return {
          ...parameter,
          value: newValue,
        };
      }
      return parameter;
    });
    onChange(newParameters);
  };

  const handleParameterChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    changeParameter(event.target.name, event.target.value);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeParameter(event.target.name, event.target.checked);
  };

  const handleSliderChange = (name: string) => (
    event: Event,
    newValue: number | number[]
  ) => {
    changeParameter(name, newValue);
  };

  const handleAutocompleteChange = (name) => (newValue?) => {
    changeParameter(name, newValue);
  };

  // Group parameters
  const groups = useMemo(
    () =>
      parameters.reduce((acc, parameter) => {
        if (parameter.group) {
          if (!acc[parameter.group]) {
            acc[parameter.group] = [];
          }
          acc[parameter.group].push(parameter);
        } else {
          acc[''] = acc[''] || [];
          acc[''].push(parameter);
        }
        return acc;
      }, {}) as { [key: string]: Parameters },
    [parameters]
  );

  return (
    <div style={{ height: '100%', overflow: 'scroll' }}>
      <Alert severity="info" sx={{ mb: 1 }}>
        <AlertTitle>Customizer</AlertTitle>
        Adjust the parameters of your design.
      </Alert>
      <TextField
        select
        label="Select File"
        value={selectedFile}
        onChange={handleFileSelect}
        fullWidth
        sx={{ mb: 2 }}
      >
        {filteredFiles.map((file) => (
          <MenuItem key={file.path} value={file.path}>
            {file.name.replace(/\.[^/.]+$/, '')}
          </MenuItem>
        ))}
      </TextField>
      {Object.entries(groups)
        .filter((x) => x[0].toLowerCase() !== 'hidden')
        .map(([groupName, groupParams], idx) => (
          <Accordion defaultExpanded={idx === 0} key={idx}>
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              {groupName || <i>Common Parameters</i>}
            </AccordionSummary>
            <AccordionDetails>
              {groupParams.map((parameter) => {
                if (parameter.type === 'number' && parameter.range) {
                  // Render slider with numeric min, max, and current value
                  return (
                    <div key={parameter.name} style={{ marginTop: 16, padding: 8 }}>
                      <label htmlFor={parameter.name}>
                        {parameter.name.replace(/_/g, ' ')}
                        {parameter.description ? `: ${parameter.description}` : ''}
                      </label>
                      <Slider
                        name={parameter.name}
                        value={parameter.value as number}
                        min={parameter.range.min}
                        max={parameter.range.max}
                        step={parameter.range.step}
                        onChange={handleSliderChange(parameter.name)}
                        valueLabelDisplay="auto"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Min: {parameter.range.min}</span>
                        <span>Value: {parameter.value}</span>
                        <span>Max: {parameter.range.max}</span>
                      </div>
                    </div>
                  );
                } else if (
                  parameter.type === 'number' ||
                  parameter.type === 'string'
                ) {
                  if (parameter.options) {
                    return (
                      <TextField
                        select
                        label={parameter.name.replace(/_/g, ' ') + (parameter.description ? `: ${parameter.description}` : '')}
                        fullWidth
                        key={parameter.name}
                        name={parameter.name}
                        onChange={handleParameterChange}
                        value={parameter.value}
                        sx={{ mt: 2, p: 1 }}
                      >
                        {parameter.options.map((option, idx) => (
                          <MenuItem key={idx} value={option.value}>
                            {option.label || option.value}
                          </MenuItem>
                        ))}
                      </TextField>
                    );
                  }

                  return (
                    <TextField
                      label={parameter.name.replace(/_/g, ' ') + (parameter.description ? `: ${parameter.description}` : '')}
                      fullWidth
                      type={parameter.type}
                      key={parameter.name}
                      name={parameter.name}
                      onChange={handleParameterChange}
                      value={parameter.value}
                      InputProps={{
                        inputProps: {
                          maxLength: parameter.range?.max,
                          min: parameter.range?.min,
                          max: parameter.range?.max,
                          step: parameter.range?.step,
                        },
                      }}
                      sx={{ mt: 2, p: 1 }}
                    />
                  );
                } else if (parameter.type === 'boolean') {
                  return (
                    <FormGroup key={parameter.name}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name={parameter.name}
                            onChange={handleCheckboxChange}
                            checked={parameter.value === true}
                          />
                        }
                        label={parameter.description || parameter.name.replace(/_/g, ' ')}
                      />
                    </FormGroup>
                  );
                } else if (
                  parameter.type === 'number[]' ||
                  parameter.type === 'string[]' ||
                  parameter.type === 'boolean[]'
                ) {
                  const type = parameter.type.replace('[]', '');
                  let validate;

                  if (type === 'number') {
                    validate = validateNumber;
                  } else if (type === 'boolean') {
                    validate = validateBoolean;
                  }

                  return (
                    <MuiChipsInput
                      key={parameter.name}
                      fullWidth
                      label={parameter.description || parameter.name.replace(/_/g, ' ')}
                      onChange={handleAutocompleteChange(parameter.name)}
                      renderChip={(Component, key, chipProps) => {
                        // Rendering the label with a boolean would lead to errors,
                        // hence the toString() call.
                        return (
                          <Component
                            key={key}
                            {...chipProps}
                            title={chipProps.title.toString()}
                            label={chipProps.label.toString()}
                          />
                        );
                      }}
                      sx={{
                        mt: 2,
                        p: 1,
                      }}
                      validate={validate}
                      value={(
                        parameter.value as string[] | number[] | boolean[]
                      ).map((x) => x.toString())}
                    />
                  );
                }

                return (
                  <div key={parameter.name}>
                    {parameter.name} {parameter.type}
                  </div>
                );
              })}
            </AccordionDetails>
          </Accordion>
        ))}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message="Click 'Render' to generate the new file"
      />
    </div>
  );
}
