import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import FaceScan from "./page/FaceScan";

function App() {
  return (
    <>
      <div>
        <Navbar />
        {/* <Sidebar /> */}
        <FaceScan />
      </div>
    </>
  );
}

export default App;
