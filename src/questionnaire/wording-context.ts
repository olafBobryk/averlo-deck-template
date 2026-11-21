'use client';

import { createContext, useContext } from 'react';
import { englishCopy, type InterfaceCopy } from './wording.js';

export const InterfaceCopyContext = createContext<InterfaceCopy>(englishCopy);
export const useInterfaceCopy = () => useContext(InterfaceCopyContext);
