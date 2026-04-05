import './App.scss';
import {Routes, Route} from 'react-router';
import FormPage from './pages/FormPage.tsx';

export default function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<FormPage/>}/>
                <Route path="/form" element={<FormPage/>}/>
            </Routes>
        </>
    )
}