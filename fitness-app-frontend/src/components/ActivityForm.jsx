import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import React from 'react'
import { addActivity } from '../services/api';

const ActivityForm = ({onActivitysAdded}) => {
  const [activity, setAcitivty] = React.useState({type:'RUNNING', duration: '', caloriesBurned: '', additionalMetrcis: {}});
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await addActivity(activity);
      onActivitysAdded();
      setAcitivty({type:"RUNNING", duration: '', caloriesBurned: ''});
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  }
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Acitivty Type</InputLabel>
        <Select
          value={activity.type}
          onChange={(e) => setAcitivty({...activity, type: e.target.value})}>
            <MenuItem value="RUNNING">Running</MenuItem>
            <MenuItem value="WALKING">Walking</MenuItem>
            <MenuItem value="CYCLING">Cycling</MenuItem>
        </Select>
      </FormControl>
      <TextField 
        fullWidth 
        label="Duration (minutes)" 
        type="number" value={activity.duration} 
        onChange={(e) => setAcitivty({...activity, duration: e.target.value})} 
        sx={{ mb: 2 }} 
      />
      <TextField 
        fullWidth 
        label="Calories Burned" 
        type="number" value={activity.caloriesBurned} 
        onChange={(e) => setAcitivty({...activity, caloriesBurned: e.target.value})} 
        sx={{ mb: 2 }} 
      />
      <Button type="submit" variant="contained" color="primary">
        Add Activity
      </Button>
    </Box>
  )
}

export default ActivityForm