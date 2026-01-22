import React from 'react';
import { LAYOUT_BLOCKS } from './BlockPalette';
import VariablesPanel from './VariablesPanel';

/**
 * EditorSidebar - Left sidebar with blocks and variables tabs
 */
export default function EditorSidebar({
  sidebarTab,
  onTabChange,
  onInsertBlock,
  onInsertVariable
}) {
  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Sidebar tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTabChange('blocks')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            sidebarTab === 'blocks' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
            </svg>
            Block
          </span>
          {sidebarTab === 'blocks' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => onTabChange('variables')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            sidebarTab === 'variables' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Variabler
          </span>
          {sidebarTab === 'variables' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Sidebar content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'blocks' ? (
          <div className="p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Klicka för att infoga block vid markören. <span className="text-blue-500">↔</span> = storlek kan ändras
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_BLOCKS.map(block => (
                <button
                  key={block.id}
                  onClick={() => onInsertBlock(block)}
                  className={`p-2 bg-gray-50 dark:bg-gray-900 border rounded-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group ${
                    block.isResizable ? 'border-blue-200' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  title={block.isResizable ? `${block.name} (klicka & dra för att ändra storlek)` : block.name}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{block.icon}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 truncate">
                      {block.name}
                    </span>
                    {block.isResizable && (
                      <span className="ml-auto text-[9px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">↔</span>
                    )}
                  </div>
                  <div className="h-10 overflow-hidden rounded bg-white dark:bg-gray-800 p-1 border border-gray-100 dark:border-gray-700">
                    {block.preview}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <VariablesPanel onInsertVariable={onInsertVariable} />
        )}
      </div>
    </div>
  );
}
