import { Link } from 'react-router-dom'

import baseLogo from "../../../assets/BGlogoBase.png"
import textLogoIcon from "../../../assets/bgTextualIcon.png"
import { useEffect, useState } from 'react';

const Logo = () => {

    return (
        <div>
            <div className="flex items-center gap-2.5">
                {/* for mobile view logo */}
                <Link to={'/'}>
                    <img className='h-12 w-12 md:hidden' src={baseLogo} alt="Logo" />
                </Link>

                {/* for desktop view logo */}
                <Link to={'/'}>
                    <img className='h-12 hidden md:block' src={textLogoIcon} alt="Logo" />
                </Link>

            </div>
        </div>
    )
}

export default Logo