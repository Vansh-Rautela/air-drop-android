
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

const Header = ({ title, showBackButton = false }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHome = location.pathname === "/";
  const pageTitle = title || (isHome ? "FileShare" : "");
  
  return (
    <header className="flex items-center justify-between py-4 mb-4">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {pageTitle}
        </h1>
      </div>
      
      {!isHome && (
        <Link to="/" className="text-sm font-medium text-file-blue">
          Home
        </Link>
      )}
    </header>
  );
};

export default Header;
