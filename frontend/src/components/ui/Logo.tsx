import { Link } from 'react-router-dom'

import bgTextualIcon from "@/assets/bgTextualIcon.png"
import BGlogoBase from "@/assets/BGlogoBase.png";

const Logo = () => {

    return (
        <div>
            <div className="flex items-center gap-2.5">
                {/* for mobile view logo */}
                <Link to={'/'}>
                    <img className='h-12 w-12 md:hidden' src={BGlogoBase} alt="Logo" />
                </Link>

                {/* for desktop view logo */}
                <Link to={'/'}>
                    <img className='h-12 hidden md:block' src={bgTextualIcon} alt="Logo" />
                </Link>

            </div>
        </div>
    )
}

export default Logo